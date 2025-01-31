/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Promises } from 'vs/base/common/async';
import { Codicon } from 'vs/base/common/codicons';
import { Emitter } from 'vs/base/common/event';
import { Disposable } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import { registerIcon } from 'vs/platform/theme/common/iconRegistry';
import { IUserDataProfile, IUserDataProfilesService } from 'vs/platform/userDataProfile/common/userDataProfile';
import { DidChangeUserDataProfileEvent, IUserDataProfileService } from 'vs/workbench/services/userDataProfile/common/userDataProfile';

const defaultUserDataProfileIcon = registerIcon('defaultProfile-icon', Codicon.settings, localize('defaultProfileIcon', 'Icon for Default Profile.'));

export class UserDataProfileService extends Disposable implements IUserDataProfileService {

	readonly _serviceBrand: undefined;

	private readonly _onDidChangeCurrentProfile = this._register(new Emitter<DidChangeUserDataProfileEvent>());
	readonly onDidChangeCurrentProfile = this._onDidChangeCurrentProfile.event;

	private readonly _onDidUpdateCurrentProfile = this._register(new Emitter<void>());
	readonly onDidUpdateCurrentProfile = this._onDidUpdateCurrentProfile.event;

	private _currentProfile: IUserDataProfile;
	get currentProfile(): IUserDataProfile { return this._currentProfile; }

	constructor(
		currentProfile: IUserDataProfile,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService
	) {
		super();
		this._currentProfile = currentProfile;
		this._register(userDataProfilesService.onDidChangeProfiles(e => {
			const updatedCurrentProfile = e.updated.find(p => this._currentProfile.id === p.id);
			if (updatedCurrentProfile) {
				this._currentProfile = updatedCurrentProfile;
				this._onDidUpdateCurrentProfile.fire();
			}
		}));
	}

	async updateCurrentProfile(userDataProfile: IUserDataProfile, preserveData: boolean): Promise<void> {
		if (this._currentProfile.id === userDataProfile.id) {
			return;
		}
		const previous = this._currentProfile;
		this._currentProfile = userDataProfile;
		const joiners: Promise<void>[] = [];
		this._onDidChangeCurrentProfile.fire({
			preserveData,
			previous,
			profile: userDataProfile,
			join(promise) {
				joiners.push(promise);
			}
		});
		await Promises.settled(joiners);
	}

	getShortName(profile: IUserDataProfile): string {
		if (profile.isDefault) {
			return `$(${defaultUserDataProfileIcon.id})`;
		}
		if (profile.shortName) {
			return profile.shortName;
		}
		if (profile.isTransient) {
			return `T${profile.name.charAt(profile.name.length - 1)}`;
		}
		return profile.name.substring(0, 2).toUpperCase();
	}

}
